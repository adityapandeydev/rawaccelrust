using Microsoft.Extensions.DependencyInjection;
using System;
using userinterface.Services;
using IBackEnd = userspace_backend.IBackEnd;
using BE = userspace_backend.Model;

namespace userinterface.ViewModels.Device
{
    public partial class DevicesPageViewModel : ViewModelBase
    {
        private DevicesListViewModel? devicesList;
        private DeviceGroupsViewModel? deviceGroups;
        private readonly IBackEnd backEnd;
        private readonly IModalService modalService;
        private readonly LocalizationService localizationService;

        public DevicesPageViewModel(IBackEnd backEnd, IModalService modalService, LocalizationService localizationService)
        {
            this.backEnd = backEnd ?? throw new ArgumentNullException(nameof(backEnd));
            this.modalService = modalService;
            this.localizationService = localizationService;
        }

        public DevicesListViewModel DevicesList =>
            devicesList ??= new DevicesListViewModel(backEnd, modalService, localizationService);

        public DeviceGroupsViewModel DeviceGroups =>
            deviceGroups ??= new DeviceGroupsViewModel(backEnd.Devices.DeviceGroups);

        protected BE.DevicesModel DevicesModel => backEnd.Devices;
    }
}