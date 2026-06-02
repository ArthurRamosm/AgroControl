namespace AgroControl.API.Models;

public class Despesa
{
    public int Id { get; set; }
    public int PropriedadeId { get; set; }
    public int? AnimalId { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public string? Descricao { get; set; }
    public decimal Valor { get; set; }
    public DateTime DataDespesa { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public Propriedade Propriedade { get; set; } = null!;
    public Animal? Animal { get; set; }
}
