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

        private static IBackEnd BuildBackEndWithDefaults()
        {
            var services = new ServiceCollection();
            services.AddSingleton<IBackEndLoader>(new StubBackEndLoader());
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
    }
}
