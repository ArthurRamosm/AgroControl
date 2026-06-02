namespace AgroControl.API.DTOs;

public class AtualizarPerfilDto
{
    public int UsuarioId { get; set; }
    public string? Nome { get; set; }
    public string? Email { get; set; }
}

public class AlterarSenhaDto
{
    public int UsuarioId { get; set; }
    public string SenhaAtual { get; set; } = string.Empty;
    public string NovaSenha { get; set; } = string.Empty;
}
