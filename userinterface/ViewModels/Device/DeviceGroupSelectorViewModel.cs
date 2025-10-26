using System.Collections.ObjectModel;
using userspace_backend.Model;

namespace userinterface.ViewModels.Device
{
    public partial class DeviceGroupSelectorViewModel : ViewModelBase
    {
        protected string selectedEntry = null!;

        public DeviceGroupSelectorViewModel(DeviceModel device, DeviceGroups deviceGroupsBE)
        {
            Device = device;
            DeviceGroupsBE = deviceGroupsBE;
            RefreshSelectedDeviceGroup();
        }

        protected DeviceModel Device { get; }
        protected DeviceGroups DeviceGroupsBE { get; }

        public ObservableCollection<string> DeviceGroupEntries =>
            DeviceGroupsBE.DeviceGroupModels;

        public string SelectedEntry
        {
            get => selectedEntry;
            set
            {
                if (DeviceGroupEntries.Contains(value))
                {
                    Device.DeviceGroup.TryUpdateUserInput(value);
                    selectedEntry = value;
                }
            }
        }

        public bool IsValid { get; set; }

        public void RefreshSelectedDeviceGroup()
        {
            if (!DeviceGroupEntries.Contains(Device.DeviceGroup.ModelValue))
            {
                IsValid = false;
                SelectedEntry = DeviceGroups.DefaultDeviceGroup;
                return;
            }

            IsValid = true;
            selectedEntry = Device.DeviceGroup.ModelValue;
        }
    }
}
