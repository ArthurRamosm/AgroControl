namespace AgroControl.API.DTOs;

public class PropriedadeResumoDto
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string? Cidade { get; set; }
    public string? Estado { get; set; }
    public string FocoProdutivo { get; set; } = "ambos";
}

public class AtualizarPropriedadeDto
{
    public string? Cidade { get; set; }
    public string? Estado { get; set; }
    public string? FocoProdutivo { get; set; }
}
