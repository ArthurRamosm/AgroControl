namespace AgroControl.API.Models;

public class Animal
{
    public int Id { get; set; }
    public string Brinco { get; set; } = string.Empty;
    public string? Nome { get; set; }
    public string Raca { get; set; } = string.Empty;
    public string Sexo { get; set; } = string.Empty;       // "M" ou "F"
    public string Tipo { get; set; } = string.Empty;       // Vaca, Touro, Novilha...
    public string StatusLeite { get; set; } = "N/A";
    public bool Ativo { get; set; } = true;

    public int PropriedadeId { get; set; }
    public Propriedade Propriedade { get; set; } = null!;
}
