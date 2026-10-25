using System.Text.Json.Serialization;

namespace Bank101.Api.Core;

/// <summary>
/// FastAPI's HTTPException body: {"detail": "Invalid credentials"}.
/// </summary>
public record ErrorResponse(string Detail);

/// <summary>
/// One entry of FastAPI's 422 body. The register form reads <c>loc.at(-1)</c> to
/// decide which input to highlight, so the field name must be the last element and
/// must be the snake_case name the client posted.
///
/// Property order matches Pydantic's (type, loc, msg, input, ctx). `ctx` is omitted
/// entirely for "missing" errors, again matching Pydantic.
/// </summary>
public record ValidationErrorItem(
    string Type,
    string[] Loc,
    string Msg,
    object? Input,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    Dictionary<string, object>? Ctx = null);

/// <summary>FastAPI's 422 envelope: {"detail": [ ...items... ]}.</summary>
public record ValidationErrorResponse(IReadOnlyList<ValidationErrorItem> Detail);

public static class ApiErrors
{
    public static IResult Detail(int statusCode, string message)
        => Results.Json(new ErrorResponse(message), statusCode: statusCode);

    public static IResult Unauthorized(string message = "Could not validate credentials")
        => Results.Json(new ErrorResponse(message), statusCode: StatusCodes.Status401Unauthorized);

    public static IResult NotFound(string message)
        => Results.Json(new ErrorResponse(message), statusCode: StatusCodes.Status404NotFound);

    public static IResult Conflict(string message)
        => Results.Json(new ErrorResponse(message), statusCode: StatusCodes.Status409Conflict);

    public static IResult Forbidden(string message)
        => Results.Json(new ErrorResponse(message), statusCode: StatusCodes.Status403Forbidden);
}
