using Nuevo.PMO.Domain.Entities;

namespace Nuevo.PMO.Application.Common.Interfaces;

public interface ITokenService
{
    string IssueAccessToken(User user, out DateTime expiresAt);
}
