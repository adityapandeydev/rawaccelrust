using System;
using System.Collections.Generic;
using System.Linq;
using DATA = userspace_backend.Data;
using userspace_backend.Model;
using Microsoft.Extensions.DependencyInjection;

namespace userspace_backend
{
    public interface IBackEnd
    {
        void Load();

        void Apply();

        DevicesModel Devices { get; }

        MappingsModel Mappings { get; }

        IProfilesModel Profiles { get; }
    }

    public class BackEnd : IBackEnd
    {
        public BackEnd(
            IBackEndLoader backEndLoader,
            IProfilesModel profilesModel,
            DevicesModel devicesModel,
            MappingsModel mappingsModel,
            IServiceProvider serviceProvider)
        {
            BackEndLoader = backEndLoader;
            Devices = devicesModel;
            Mappings = mappingsModel;
            Profiles = profilesModel;
            ServiceProvider = serviceProvider;
        }

        public DevicesModel Devices { get; set; }

        public MappingsModel Mappings { get; set; }

        public IProfilesModel Profiles { get; set; }

        protected IBackEndLoader BackEndLoader { get; set; }

        protected IServiceProvider ServiceProvider { get; set; }

        public void Load()
        {
            IEnumerable<DATA.Device> devicesData = BackEndLoader.LoadDevices();
            LoadDevicesFromData(devicesData);

            IEnumerable<DATA.Profile> profilesData = BackEndLoader.LoadProfiles();
            LoadProfilesFromData(profilesData);

            // Ensure at least one default profile exists
            EnsureDefaultProfileExists();

            DATA.MappingSet mappingData = BackEndLoader.LoadMappings();
            LoadMappingsFromData(mappingData);
        }

        protected void LoadDevicesFromData(IEnumerable<DATA.Device> devicesData)
        {
            Devices.TryMapFromData(devicesData);
        }

        protected void LoadProfilesFromData(IEnumerable<DATA.Profile> profileData)
        {
            Profiles.TryMapFromData(profileData);
        }

        protected void LoadMappingsFromData(DATA.MappingSet mappingData)
        {
            // Clear existing mappings and reload from data
            Mappings.Mappings.Clear();
            foreach (var mapping in mappingData.Mappings)
            {
                Mappings.TryAddMapping(mapping);
            }
        }

        protected void EnsureDefaultProfileExists()
        {
            // If no "Default" profile exists, create one and add it to the beginning
            if (!Profiles.TryGetElement("Default", out _))
            {
                var defaultProfile = ServiceProvider.GetRequiredService<IProfileModel>();
                defaultProfile.Name.TryUpdateModelDirectly("Default");
                Profiles.TryInsert(0, defaultProfile);
            }
        }

        public void Apply()
        {
            try
            {
                //WriteToDriver();
            }
            catch (Exception ex)
            {
                return;
            }

            WriteSettingsToDisk();
        }

        protected void WriteSettingsToDisk()
        {
            BackEndLoader.WriteSettingsToDisk(
                Devices.Elements,
                Mappings,
                Profiles.Elements);
        }

        protected void WriteToDriver()
        {
            MappingModel mappingToApply = Mappings.GetMappingToSetActive();
            DriverConfig config = MapToDriverConfig(mappingToApply);
            try
            {
                config.Activate();
            }
            catch(Exception ex)
            {
                // Log this once logging is added
            }
        }

        protected DriverConfig MapToDriverConfig(MappingModel mappingModel)
        {
            IEnumerable<DeviceSettings> configDevices = MapToDriverDevices(mappingModel);
            IEnumerable<Profile> configProfiles = MapToDriverProfiles(mappingModel);

            DriverConfig config = DriverConfig.GetDefault();
            config.profiles = configProfiles.ToList();
            config.devices = configDevices.ToList();
            config.accels = configProfiles.Select(p => new ManagedAccel(p)).ToList();
            return config;
        }

        protected IEnumerable<DeviceSettings> MapToDriverDevices(MappingModel mapping)
        {
            return mapping.IndividualMappings.SelectMany(
                dg => MapToDriverDevices(dg.DeviceGroup, dg.Profile.Name.ModelValue));
        }

        protected IEnumerable<Profile> MapToDriverProfiles(MappingModel mapping)
        {
            IEnumerable<IProfileModel> ProfilesToMap = mapping.IndividualMappings.Select(m => m.Profile).Distinct();
            return ProfilesToMap.Select(p => p.CurrentValidatedDriverProfile);
        }

        protected IEnumerable<DeviceSettings> MapToDriverDevices(string dg, string profileName)
        {
            IEnumerable<DeviceModel> deviceModels = Devices.Elements.Where(d => d.DeviceGroup.ModelValue.Equals(dg));
            return deviceModels.Select(dm => MapToDriverDevice(dm, profileName));
        }

        protected DeviceSettings MapToDriverDevice(DeviceModel deviceModel, string profileName)
        {
            return new DeviceSettings()
            {
                id = deviceModel.HardwareID.ModelValue,
                name = deviceModel.Name.ModelValue,
                profile = profileName,
                config = new DeviceConfig()
                {
                    disable = deviceModel.Ignore.ModelValue,
                    dpi = deviceModel.DPI.ModelValue,
                    pollingRate = deviceModel.DPI.ModelValue,
                    pollTimeLock = false,
                    setExtraInfo = false,
                    maximumTime = 200,
                    minimumTime = 0.1,
                }
            };
        }
    }
}
