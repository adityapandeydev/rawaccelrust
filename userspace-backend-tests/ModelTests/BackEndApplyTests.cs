using Microsoft.Extensions.DependencyInjection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System;
using System.Collections.Generic;
using System.Linq;
using userspace_backend;
using userspace_backend.IO;
using userspace_backend.Model;
using DATA = userspace_backend.Data;

namespace userspace_backend_tests.ModelTests
{
    [TestClass]
    public class BackEndApplyTests
    {
        private sealed class StubBackEndLoader : IBackEndLoader
        {
            public IEnumerable<DATA.Device> LoadDevices() => Array.Empty<DATA.Device>();

            public DATA.MappingSet LoadMappings() => new DATA.MappingSet
            {
                Mappings = Array.Empty<DATA.Mapping>(),
                ActiveMappingIndex = 0,
            };

            public IEnumerable<DATA.Profile> LoadProfiles() => Array.Empty<DATA.Profile>();

            public DATA.Settings? LoadSettings() => null;

            public void WriteSettingsToDisk(
                IEnumerable<IDeviceModel> devices,
                MappingsModel mappings,
                IEnumerable<IProfileModel> profiles)
            {
            }

            public void WriteSettings(DATA.Settings settings)
            {
            }
        }

        private sealed class StubSystemDevicesRetriever : ISystemDevicesRetriever
        {
            public IList<ISystemDevice> Devices { get; set; } = new List<ISystemDevice>();

            public IList<ISystemDevice> GetSystemDevices() => Devices;
        }

        private sealed class StubSystemDevice : ISystemDevice
        {
            public string Name { get; init; } = string.Empty;
            public string HWID { get; init; } = string.Empty;
        }

        private static IBackEnd BuildBackEndWithDefaults(IList<ISystemDevice>? systemDevices = null)
        {
            var services = new ServiceCollection();
            services.AddSingleton<IBackEndLoader>(new StubBackEndLoader());
            // Register the stub BEFORE Compose; Compose uses TryAddSingleton so our stub wins.
            services.AddSingleton<ISystemDevicesRetriever>(new StubSystemDevicesRetriever
            {
                Devices = systemDevices ?? new List<ISystemDevice>(),
            });

            var sp = BackEndComposer.Compose(services);
            var backEnd = sp.GetRequiredService<IBackEnd>();
            backEnd.Load();
            return backEnd;
        }

        private static DriverConfig BuildActiveDriverConfig(IBackEnd backEnd)
        {
            // MapToDriverConfig is `protected internal`; visible via
            // [InternalsVisibleTo("userspace-backend-tests")] on userspace-backend.
            var concrete = (BackEnd)backEnd;
            var mapping = concrete.Mappings.GetMappingToSetActive();
            Assert.IsNotNull(mapping, "No active mapping found; EnsureDefaultMappingExists should have seeded one.");
            return concrete.MapToDriverConfig(mapping);
        }

        [TestMethod]
        public void Apply_DefaultState_ProducesOneProfileAndOneDevice()
        {
            var backEnd = BuildBackEndWithDefaults();
            var cfg = BuildActiveDriverConfig(backEnd);

            Assert.AreEqual(1, cfg.profiles.Count, "Expected exactly one profile in the DriverConfig.");
            Assert.AreEqual(1, cfg.devices.Count, "Expected exactly one device in the DriverConfig.");

            var device = cfg.devices[0];
            Assert.AreEqual("DEFAULT_DEVICE_ID", device.id);
            Assert.AreEqual(1000, device.config.dpi);
            Assert.AreEqual(1000, device.config.pollingRate);
        }

        [TestMethod]
        public void Apply_DefaultState_DeviceReferencesDefaultProfileByName()
        {
            var backEnd = BuildBackEndWithDefaults();
            var cfg = BuildActiveDriverConfig(backEnd);

            var device = cfg.devices[0];
            var profile = cfg.profiles[0];
            Assert.AreEqual(
                profile.name,
                device.profile,
                "Device.profile must match an existing Profile.name so the driver can resolve the mapping.");
        }

        [TestMethod]
        public void Apply_ProfileOutputDpiEdit_FlowsIntoDriverConfig()
        {
            var backEnd = BuildBackEndWithDefaults();
            var profile = backEnd.Profiles.Elements[0];

            Assert.IsTrue(profile.OutputDPI.TryUpdateModelDirectly(1600), "OutputDPI update should succeed.");

            var cfg = BuildActiveDriverConfig(backEnd);
            Assert.AreEqual(1600, cfg.profiles[0].outputDPI);
        }

        [TestMethod]
        public void Apply_DeviceDpiEdit_DoesNotAffectPollingRate()
        {
            var backEnd = BuildBackEndWithDefaults();
            var device = backEnd.Devices.Elements[0];

            Assert.IsTrue(device.DPI.TryUpdateModelDirectly(3200), "DPI update should succeed.");
            Assert.IsTrue(device.PollRate.TryUpdateModelDirectly(500), "PollRate update should succeed.");

            var cfg = BuildActiveDriverConfig(backEnd);
            Assert.AreEqual(3200, cfg.devices[0].config.dpi);
            Assert.AreEqual(500, cfg.devices[0].config.pollingRate);
        }

        [TestMethod]
        public void ImportSystemDevices_CreatesOneDevicePerSystemDevice()
        {
            var systemDevices = new List<ISystemDevice>
            {
                new StubSystemDevice { Name = "Logitech G Pro",    HWID = @"HID\VID_046D&PID_C54D&MI_00" },
                new StubSystemDevice { Name = "Razer DeathAdder",  HWID = @"HID\VID_1532&PID_0084" },
            };

            var backEnd = BuildBackEndWithDefaults(systemDevices);
            backEnd.ImportSystemDevices();

            // EnsureDefaultDeviceExists skipped the "Default" placeholder because system devices
            // were present, so the only devices in the list should be the imported ones.
            Assert.AreEqual(2, backEnd.Devices.Elements.Count);

            var imported = backEnd.Devices.Elements
                .Select(d => (d.Name.ModelValue, d.HardwareID.ModelValue))
                .ToList();
            CollectionAssert.Contains(imported, ("Logitech G Pro",   @"HID\VID_046D&PID_C54D&MI_00"));
            CollectionAssert.Contains(imported, ("Razer DeathAdder", @"HID\VID_1532&PID_0084"));

            foreach (var d in backEnd.Devices.Elements)
            {
                Assert.AreEqual(DeviceGroups.DefaultDeviceGroup, d.DeviceGroup.ModelValue,
                    "Imported devices should default to the Default device group.");
            }
        }

        [TestMethod]
        public void ImportSystemDevices_SkipsDevicesAlreadyPresentByHwid()
        {
            var systemDevices = new List<ISystemDevice>
            {
                new StubSystemDevice { Name = "Preloaded Mouse", HWID = @"HID\VID_9999&PID_0001" },
            };

            var backEnd = BuildBackEndWithDefaults(systemDevices);
            backEnd.ImportSystemDevices();
            Assert.AreEqual(1, backEnd.Devices.Elements.Count);

            // Re-import with the same system device — should be a no-op.
            backEnd.ImportSystemDevices();
            Assert.AreEqual(1, backEnd.Devices.Elements.Count,
                "Repeated ImportSystemDevices calls must not create duplicates when HWID already matches.");
        }

        [TestMethod]
        public void ReloadSystemDevices_RemovesDisconnectedAndAddsNew()
        {
            var initial = new List<ISystemDevice>
            {
                new StubSystemDevice { Name = "Mouse A", HWID = @"HID\VID_AAAA" },
                new StubSystemDevice { Name = "Mouse B", HWID = @"HID\VID_BBBB" },
            };

            var services = new ServiceCollection();
            services.AddSingleton<IBackEndLoader>(new StubBackEndLoader());
            var retrieverStub = new StubSystemDevicesRetriever { Devices = initial };
            services.AddSingleton<ISystemDevicesRetriever>(retrieverStub);

            var sp = BackEndComposer.Compose(services);
            var backEnd = sp.GetRequiredService<IBackEnd>();
            backEnd.Load();
            backEnd.ImportSystemDevices();
            Assert.AreEqual(2, backEnd.Devices.Elements.Count);

            // Simulate: Mouse A unplugged, Mouse C plugged in.
            retrieverStub.Devices = new List<ISystemDevice>
            {
                new StubSystemDevice { Name = "Mouse B", HWID = @"HID\VID_BBBB" },
                new StubSystemDevice { Name = "Mouse C", HWID = @"HID\VID_CCCC" },
            };

            backEnd.ReloadSystemDevices();

            var hwids = backEnd.Devices.Elements
                .Select(d => d.HardwareID.ModelValue)
                .ToList();
            CollectionAssert.AreEquivalent(
                new[] { @"HID\VID_BBBB", @"HID\VID_CCCC" },
                hwids);
        }

        [TestMethod]
        public void ImportSystemDevices_SyncsInterfaceValueSoUiReflectsRealValues()
        {
            // Regression: EditableSettingV2.TryUpdateModelDirectly used to update ModelValue
            // but not InterfaceValue. The UI binds to InterfaceValue via EditableFieldViewModel,
            // so imported devices showed the DI placeholder ("name", "hwid") even though
            // ModelValue was correct. Guard against that by asserting both properties update.
            var systemDevices = new List<ISystemDevice>
            {
                new StubSystemDevice { Name = "RealMouseName", HWID = @"HID\VID_1234&PID_5678" },
            };

            var backEnd = BuildBackEndWithDefaults(systemDevices);
            backEnd.ImportSystemDevices();

            var imported = backEnd.Devices.Elements.Single();
            Assert.AreEqual("RealMouseName",                   imported.Name.ModelValue);
            Assert.AreEqual("RealMouseName",                   imported.Name.InterfaceValue,
                "InterfaceValue must mirror ModelValue so the UI shows the imported Name.");
            Assert.AreEqual(@"HID\VID_1234&PID_5678",          imported.HardwareID.ModelValue);
            Assert.AreEqual(@"HID\VID_1234&PID_5678",          imported.HardwareID.InterfaceValue,
                "InterfaceValue must mirror ModelValue so the UI shows the imported HWID.");
        }
    }
}
