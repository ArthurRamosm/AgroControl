namespace AgroControl.API.Models;

public class EstoqueMovimentacao
{
    public int Id { get; set; }
    public int EstoqueId { get; set; }
    public string TipoMovimentacao { get; set; } = string.Empty;
    public decimal Quantidade { get; set; }
    public string? Motivo { get; set; }
    public int? AnimalId { get; set; }
    public DateTime DataMovimentacao { get; set; }
    public string? Observacao { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public EstoqueMedicamento Estoque { get; set; } = null!;
    public Animal? Animal { get; set; }
}
