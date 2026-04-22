namespace AgroControl.API.DTOs;

public class LoginResponseDto
{
    public bool Sucesso { get; set; }
    public string? Nome { get; set; }
    public int? PropriedadeId { get; set; }
    public string? Mensagem { get; set; }
}
