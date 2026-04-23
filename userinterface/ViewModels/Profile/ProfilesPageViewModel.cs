using CommunityToolkit.Mvvm.ComponentModel;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Collections.Specialized;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Threading.Tasks;
using userinterface.Interfaces;
using userinterface.Services;
using IBackEnd = userspace_backend.IBackEnd;
using BE = userspace_backend.Model;

namespace userinterface.ViewModels.Profile
{
    public partial class ProfilesPageViewModel : ViewModelBase, IAsyncInitializable
    {
        [ObservableProperty]
        public ProfileViewModel? selectedProfileView;

        private readonly INotificationService notificationService;
        private readonly BE.IProfilesModel profilesModel;
        private readonly ProfileListViewModel profileListView;
        private readonly IViewModelFactory viewModelFactory;
        private readonly ILogger<ProfilesPageViewModel> logger;

        public ProfilesPageViewModel(
            INotificationService notificationService,
            IBackEnd backEnd,
            ProfileListViewModel profileListView,
            IViewModelFactory viewModelFactory,
            ILogger<ProfilesPageViewModel>? logger = null)
        {
            this.notificationService = notificationService ?? throw new ArgumentNullException(nameof(notificationService));
            this.profilesModel = backEnd?.Profiles ?? throw new ArgumentNullException(nameof(backEnd));
            this.profileListView = profileListView ?? throw new ArgumentNullException(nameof(profileListView));
            this.viewModelFactory = viewModelFactory ?? throw new ArgumentNullException(nameof(viewModelFactory));
            this.logger = logger ?? NullLogger<ProfilesPageViewModel>.Instance;

            ProfileViewModels = [];
            UpdateProfileViewModels();

            profileListView.SelectedProfileChanged += OnProfileSelectionChanged;

            if (profilesModel.Profiles is INotifyCollectionChanged notifier)
            {
                notifier.CollectionChanged += OnProfilesCollectionChanged;
            }
        }

        private void OnProfilesCollectionChanged(object? sender, NotifyCollectionChangedEventArgs e)
        {
            switch (e.Action)
            {
                case NotifyCollectionChangedAction.Add:
                    if (e.NewItems != null)
                    {
                        int insertAt = e.NewStartingIndex >= 0 ? e.NewStartingIndex : ProfileViewModels.Count;
                        foreach (BE.IProfileModel added in e.NewItems)
                        {
                            var vm = viewModelFactory.CreateProfileViewModel(added);
                            if (insertAt >= 0 && insertAt <= ProfileViewModels.Count)
                            {
                                ProfileViewModels.Insert(insertAt++, vm);
                            }
                            else
                            {
                                ProfileViewModels.Add(vm);
                            }
                        }
                    }
                    break;

                case NotifyCollectionChangedAction.Remove:
                    if (e.OldItems != null)
                    {
                        foreach (BE.IProfileModel removed in e.OldItems)
                        {
                            var existing = ProfileViewModels
                                .FirstOrDefault(p => ReferenceEquals(p.BackEndModel, removed));
                            if (existing != null)
                            {
                                ProfileViewModels.Remove(existing);
                            }
                        }
                    }
                    break;

                case NotifyCollectionChangedAction.Reset:
                case NotifyCollectionChangedAction.Replace:
                case NotifyCollectionChangedAction.Move:
                default:
                    UpdateProfileViewModels();
                    break;
            }
        }

        private INotificationService NotificationService => notificationService;
        private BE.IProfilesModel ProfilesModel => profilesModel;
        public ProfileListViewModel ProfileListView => profileListView;

        private IEnumerable<BE.IProfileModel> ProfileModels => ProfilesModel.Profiles;

        protected ObservableCollection<ProfileViewModel> ProfileViewModels { get; }

        public bool IsInitialized { get; private set; } = true; // Already initialized in constructor

        public bool IsInitializing { get; private set; }

        public Task InitializeAsync()
        {
            if (IsInitializing || IsInitialized)
                return Task.CompletedTask;

            IsInitializing = true;

            UpdateProfileViewModels();

            IsInitializing = false;
            IsInitialized = true;

            return Task.CompletedTask;
        }


        public void UpdateCurrentProfile()
        {
            UpdateProfileViewModels();
            UpdateSelectedProfileView(ProfileListView.SelectedProfile);
        }

        private void UpdateSelectedProfileView(BE.IProfileModel? currentProfile)
        {
            if (currentProfile == null)
            {
                SelectedProfileView = ProfileViewModels.FirstOrDefault();
                return;
            }

            var match = ProfileViewModels.FirstOrDefault(p => ReferenceEquals(p.BackEndModel, currentProfile));
            if (match != null)
            {
                SelectedProfileView = match;
            }
            else
            {
                logger.LogWarning(
                    "UpdateSelectedProfileView: no ProfileViewModel found for backend profile '{Name}' ({Hash:X8})",
                    currentProfile.CurrentNameForDisplay ?? "<unnamed>",
                    RuntimeHelpers.GetHashCode(currentProfile));
            }
        }

        protected void UpdateProfileViewModels()
        {
            ProfileViewModels.Clear();
            
            foreach (var profileModelBE in ProfileModels)
            {
                var profileViewModel = viewModelFactory.CreateProfileViewModel(profileModelBE);
                ProfileViewModels.Add(profileViewModel);
            }
        }

        private void OnProfileSelectionChanged(BE.IProfileModel selectedProfile)
        {
            UpdateSelectedProfileView(selectedProfile);
        }
    }
}