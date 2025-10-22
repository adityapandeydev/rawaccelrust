namespace userspace_backend.Model.EditableSettings
{
    public class MaxNameLengthValidator : IModelValueValidator<string>
    {
        public const int MaxNameLength = 100;

        public MaxNameLengthValidator()
        {
            MaxLength = MaxNameLength;
        }

        public MaxNameLengthValidator(int maxLength)
        {
            MaxLength = maxLength;
        }

        public int MaxLength { get; }

        public bool Validate(string value)
        {
            return !string.IsNullOrEmpty(value) && value.Length <= MaxLength;
        }
    }
}
