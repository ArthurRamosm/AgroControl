using System.ComponentModel.DataAnnotations;

namespace AgroControl.API.DTOs;

public class LoginRequestDto
{
    // [OWASP M4-03] Limite de tamanho adicionado para bloquear payloads
    // abusivos (strings extremamente longas), sem alterar o comportamento
    // de login válido — nenhum usuário/senha legítimo se aproxima desses limites.
    [MaxLength(50)]
    public string Usuario { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Senha { get; set; } = string.Empty;
}
