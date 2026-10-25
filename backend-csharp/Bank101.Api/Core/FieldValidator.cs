using System.Net.Mail;

namespace Bank101.Api.Core;

/// <summary>
/// Reproduces the Pydantic Field(...) constraints from the Python schemas, including
/// the 422 body shape and message wording, so the existing React error handling keeps
/// working unchanged. Collects every failure before returning, the way Pydantic does,
/// rather than bailing on the first one.
/// </summary>
public sealed class FieldValidator
{
    private readonly List<ValidationErrorItem> _errors = [];

    public bool HasErrors => _errors.Count > 0;

    public IResult ToResult() =>
        Results.Json(new ValidationErrorResponse(_errors), statusCode: StatusCodes.Status422UnprocessableEntity);

    private void Add(string type, string field, string msg, object? input,
                     Dictionary<string, object>? ctx = null) =>
        _errors.Add(new ValidationErrorItem(type, ["body", field], msg, input, ctx));

    /// <summary>Required string with optional min/max length (Pydantic Field(min_length=, max_length=)).</summary>
    public FieldValidator String(string field, string? value, int? minLength = null, int? maxLength = null)
    {
        if (value is null)
        {
            Add("missing", field, "Field required", null);
            return this;
        }

        if (minLength is int min && value.Length < min)
        {
            Add("string_too_short", field,
                $"String should have at least {min} character{(min == 1 ? "" : "s")}",
                value, new Dictionary<string, object> { ["min_length"] = min });
        }

        if (maxLength is int max && value.Length > max)
        {
            Add("string_too_long", field,
                $"String should have at most {max} character{(max == 1 ? "" : "s")}",
                value, new Dictionary<string, object> { ["max_length"] = max });
        }

        return this;
    }

    /// <summary>Pydantic's EmailStr.</summary>
    public FieldValidator Email(string field, string? value)
    {
        if (value is null)
        {
            Add("missing", field, "Field required", null);
            return this;
        }

        if (!IsValidEmail(value))
        {
            const string reason = "An email address must have an @-sign.";
            Add("value_error", field,
                $"value is not a valid email address: {reason}",
                value, new Dictionary<string, object> { ["reason"] = reason });
        }

        return this;
    }

    /// <summary>A required value that failed to bind (e.g. a malformed date).</summary>
    public FieldValidator Required<T>(string field, T? value) where T : struct
    {
        if (value is null) Add("missing", field, "Field required", null);
        return this;
    }

    /// <summary>Pydantic Field(gt=0) on a Decimal.</summary>
    public FieldValidator GreaterThanZero(string field, decimal value)
    {
        if (value <= 0)
        {
            Add("greater_than", field, "Input should be greater than 0",
                value, new Dictionary<string, object> { ["gt"] = 0 });
        }

        return this;
    }

    private static bool IsValidEmail(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        try
        {
            var addr = new MailAddress(value);
            // MailAddress accepts a bare hostname; email-validator (used by EmailStr)
            // requires a dotted domain.
            return addr.Address == value && addr.Host.Contains('.');
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
