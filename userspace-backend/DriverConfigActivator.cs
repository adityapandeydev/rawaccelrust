namespace userspace_backend
{
    public interface IDriverConfigActivator
    {
        void Write(DriverConfig config);
    }

    public sealed class DriverConfigActivator : IDriverConfigActivator
    {
        public void Write(DriverConfig config) => config.Activate();
    }
}
