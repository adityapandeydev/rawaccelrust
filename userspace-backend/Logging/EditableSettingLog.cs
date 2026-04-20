using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace userspace_backend.Logging
{
    public static class EditableSettingLog
    {
        public static ILogger Logger { get; private set; } = NullLogger.Instance;

        public static void Configure(ILoggerFactory factory)
        {
            Logger = factory.CreateLogger("userspace_backend.EditableSetting");
        }
    }
}
