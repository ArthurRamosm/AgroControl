using Microsoft.EntityFrameworkCore;
using AgroControl.API.Data;
using AgroControl.API.DTOs;

namespace AgroControl.API.Services;

public class AuthService
{
    private readonly AppDbContext _db;

    public AuthService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request)
    {
        var usuario = await _db.Usuarios
            .Include(u => u.Propriedade)
            .FirstOrDefaultAsync(u => u.NomeUsuario == request.Usuario
                                   && u.Senha == request.Senha);

        if (usuario is null)
        {
            return new LoginResponseDto
            {
                Sucesso = false,
                Mensagem = "Usuário ou senha inválidos"
            };
        }

        return new LoginResponseDto
        {
            Sucesso = true,
            Nome = usuario.NomeUsuario,
            PropriedadeId = usuario.PropriedadeId
        };
    }
}
