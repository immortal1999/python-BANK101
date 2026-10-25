using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Bank101.Api.Core.Json;

/// <summary>
/// Writes decimals as JSON strings ("1234.56"), which is what Pydantic does for
/// Decimal fields. The React dashboard relies on it: money arrives as a string and
/// is only ever passed through Number() for display, never for arithmetic. Emitting
/// bare JSON numbers here would silently reintroduce float rounding on the client.
/// </summary>
public class DecimalAsStringConverter : JsonConverter<decimal>
{
    public override decimal Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => reader.TokenType switch
        {
            JsonTokenType.String => decimal.Parse(reader.GetString()!, NumberStyles.Number, CultureInfo.InvariantCulture),
            JsonTokenType.Number => reader.GetDecimal(),
            _ => throw new JsonException($"Expected a number or numeric string, got {reader.TokenType}."),
        };

    public override void Write(Utf8JsonWriter writer, decimal value, JsonSerializerOptions options)
        => writer.WriteStringValue(value.ToString(CultureInfo.InvariantCulture));

    public override void WriteAsPropertyName(Utf8JsonWriter writer, decimal value, JsonSerializerOptions options)
        => writer.WritePropertyName(value.ToString(CultureInfo.InvariantCulture));
}

/// <summary>Same treatment for nullable decimals.</summary>
public class NullableDecimalAsStringConverter : JsonConverter<decimal?>
{
    private static readonly DecimalAsStringConverter Inner = new();

    public override decimal? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => reader.TokenType == JsonTokenType.Null ? null : Inner.Read(ref reader, typeof(decimal), options);

    public override void Write(Utf8JsonWriter writer, decimal? value, JsonSerializerOptions options)
    {
        if (value is null) writer.WriteNullValue();
        else Inner.Write(writer, value.Value, options);
    }
}
