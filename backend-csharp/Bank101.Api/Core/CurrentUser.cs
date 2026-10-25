using System.Security.Claims;
using Bank101.Api.Core.Security;
using Bank101.Api.Data;
using Bank101.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Bank101.Api.Core;

/// <summary>
/// Port of get_current_user() from app/api/deps.py. The JWT bearer middleware has
/// already verified the signature and expiry by the time this runs; what is left is
/// turning the "sub" claim into a User row, and 401-ing if it no longer resolves
/// (e.g. the account was deleted while the token was still live).
/// </summary>
public static class CurrentUser
{
    public static async Task<User?> ResolveAsync(
        ClaimsPrincipal principal,
        BankDbContext db,
        CancellationToken ct = default)
    {
        var userId = TokenService.GetUserId(principal);
        if (userId is null) return null;

        return await db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
    }
}
