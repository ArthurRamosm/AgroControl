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

    // [OWASP M1] Senhas passaram a ser armazenadas como hash BCrypt em vez
    // de texto plano. Ver docs/security/owasp-m1-relatorio.json (M1-06).

    /// <summary>Gera o hash BCrypt para persistir uma senha.</summary>
    public static string GerarHash(string senha) => BCrypt.Net.BCrypt.HashPassword(senha);

    /// <summary>Indica se o valor armazenado já é um hash BCrypt (prefixo $2*).</summary>
    public static bool EhHashBcrypt(string valor) =>
        !string.IsNullOrEmpty(valor) && valor.StartsWith("$2");

    /// <summary>
    /// Verifica a senha informada contra o valor armazenado. Suporta contas
    /// legadas que ainda guardam a senha em texto plano (pré-migração).
    /// </summary>
    public static bool VerificarSenha(string senhaInformada, string senhaArmazenada)
    {
        if (EhHashBcrypt(senhaArmazenada))
            return BCrypt.Net.BCrypt.Verify(senhaInformada, senhaArmazenada);

        // Compatibilidade com contas criadas antes da correção do OWASP M1.
        return senhaArmazenada == senhaInformada;
    }

    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request)
    {
        var usuario = await _db.Usuarios
            .Include(u => u.Propriedade)
            .FirstOrDefaultAsync(u => u.NomeUsuario == request.Usuario);

        if (usuario is null || !VerificarSenha(request.Senha, usuario.Senha))
        {
            return new LoginResponseDto
            {
                Sucesso = false,
                Mensagem = "Usuário ou senha inválidos"
            };
        }

        // Migração automática: no primeiro login bem-sucedido após a correção,
        // senhas legadas em texto plano são re-gravadas como hash BCrypt.
        if (!EhHashBcrypt(usuario.Senha))
        {
            usuario.Senha = GerarHash(request.Senha);
            await _db.SaveChangesAsync();
        }

        return new LoginResponseDto
        {
            Sucesso = true,
            Id = usuario.Id,
            Nome = string.IsNullOrWhiteSpace(usuario.Nome) ? usuario.NomeUsuario : usuario.Nome,
            Usuario = usuario.NomeUsuario,
            Email = usuario.Email,
            PropriedadeId = usuario.PropriedadeId,
            Propriedade = usuario.Propriedade is null ? null : new PropriedadeLoginDto
            {
                Nome = usuario.Propriedade.Nome,
                Cidade = usuario.Propriedade.Cidade ?? string.Empty,
                Estado = usuario.Propriedade.Estado ?? string.Empty,
                FocoProdutivo = usuario.Propriedade.FocoProdutivo,
            },
        };
    }
}
