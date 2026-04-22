namespace AgroControl.API.DTOs;

public class LoginRequestDto
{
    public string Usuario { get; set; } = string.Empty;
    public string Senha { get; set; } = string.Empty;
}
