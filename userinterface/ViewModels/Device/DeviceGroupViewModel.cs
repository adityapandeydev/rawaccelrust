using System.Diagnostics;
using System.Windows.Input;
using userinterface.Commands;
using BE = userspace_backend.Model;

namespace userinterface.ViewModels.Device
{
    public partial class DeviceGroupViewModel : ViewModelBase
    {
        public DeviceGroupViewModel(string deviceGroupBE, BE.DeviceGroups deviceGroupsBE, bool isDefault = false)
        {
            DeviceGroupBE = deviceGroupBE;
            DeviceGroupsBE = deviceGroupsBE;
            IsDefaultGroup = isDefault;

            DeleteCommand = new RelayCommand(
                () => DeleteSelf());
        }

        public string DeviceGroupBE { get; }

        protected BE.DeviceGroups DeviceGroupsBE { get; }

        public bool IsDefaultGroup { get; }

        public ICommand DeleteCommand { get; }

        public void DeleteSelf()
        {
            bool success = DeviceGroupsBE.RemoveDeviceGroup(DeviceGroupBE);
            Debug.Assert(success);
        }
    }
}