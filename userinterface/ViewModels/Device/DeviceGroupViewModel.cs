using System.Diagnostics;
using BE = userspace_backend.Model;

namespace userinterface.ViewModels.Device
{
    public partial class DeviceGroupViewModel : ViewModelBase
    {
        public DeviceGroupViewModel(string deviceGroupBE, BE.DeviceGroups deviceGroupsBE)
        {
            DeviceGroupBE = deviceGroupBE;
            DeviceGroupsBE = deviceGroupsBE;
        }

        public string DeviceGroupBE { get; }

        protected BE.DeviceGroups DeviceGroupsBE { get; }

        public void DeleteSelf()
        {
            bool success = DeviceGroupsBE.RemoveDeviceGroup(DeviceGroupBE);
            Debug.Assert(success);
        }
    }
}
