namespace AgroControl.API.DTOs;

public class LoginResponseDto
{
    public bool Sucesso { get; set; }
    public int? Id { get; set; }
    public string? Nome { get; set; }
    public string? Usuario { get; set; }
    public string? Email { get; set; }
    public int? PropriedadeId { get; set; }
    public PropriedadeLoginDto? Propriedade { get; set; }
    public string? Mensagem { get; set; }
}

public class PropriedadeLoginDto
{
    public string Nome { get; set; } = string.Empty;
    public string Cidade { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public string FocoProdutivo { get; set; } = "ambos";
}
