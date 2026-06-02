namespace AgroControl.API.Models;

public class PropriedadePonto
{
    public int Id { get; set; }
    public int PropriedadeId { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public string? Observacao { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public Propriedade Propriedade { get; set; } = null!;
}
