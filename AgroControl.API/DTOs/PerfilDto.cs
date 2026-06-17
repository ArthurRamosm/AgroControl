using System.ComponentModel.DataAnnotations;

namespace AgroControl.API.DTOs;

public class AtualizarPerfilDto
{
    public int UsuarioId { get; set; }

    // [OWASP M4-03] Limites de tamanho adicionados para bloquear payloads
    // abusivos, mantendo o mesmo comportamento de hoje (campos opcionais,
    // sem [Required]/[EmailAddress] — para não rejeitar nada que era aceito
    // antes). Limites alinhados aos já usados em RegisterRequestDto.
    [MaxLength(100)]
    public string? Nome { get; set; }

    [MaxLength(150)]
    public string? Email { get; set; }
}

public class AlterarSenhaDto
{
    public int UsuarioId { get; set; }

    [MaxLength(200)]
    public string SenhaAtual { get; set; } = string.Empty;

    [MaxLength(200)]
    public string NovaSenha { get; set; } = string.Empty;
}
