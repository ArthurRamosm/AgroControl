namespace AgroControl.API.Models;

public class Propriedade
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string? Cidade { get; set; }
    public string? Estado { get; set; }
    public string FocoProdutivo { get; set; } = "ambos";

    public ICollection<Usuario> Usuarios { get; set; } = new List<Usuario>();
    public ICollection<PropriedadeArea> Areas { get; set; } = new List<PropriedadeArea>();
    public ICollection<PropriedadePonto> Pontos { get; set; } = new List<PropriedadePonto>();
}
