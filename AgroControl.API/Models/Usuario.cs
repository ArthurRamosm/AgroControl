namespace AgroControl.API.Models;

public class Usuario
{
    public int Id { get; set; }
    public string NomeUsuario { get; set; } = string.Empty;
    public string Senha { get; set; } = string.Empty;

    public int PropriedadeId { get; set; }
    public Propriedade Propriedade { get; set; } = null!;
}
