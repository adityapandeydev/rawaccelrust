using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace userspace_backend.Logging
{
    /// <summary>
    /// Ambient logger used by the generic <c>EditableSettingV2&lt;T&gt;</c> / <c>EditableSetting&lt;T&gt;</c>
    /// classes. Each closed generic instantiation would otherwise need its own static field;
    /// routing through a non-generic static keeps the setup to one call at app startup.
    /// </summary>
    public static class EditableSettingLog
    {
        public static ILogger Logger { get; private set; } = NullLogger.Instance;

        public static void Configure(ILoggerFactory factory)
        {
            Logger = factory.CreateLogger("userspace_backend.EditableSetting");
        }
    }
}
