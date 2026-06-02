namespace AgroControl.API.Models;

public class EstoqueMedicamento
{
    public int Id { get; set; }
    public int PropriedadeId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string Unidade { get; set; } = string.Empty;
    public decimal QuantidadeAtual { get; set; }
    public decimal? QuantidadeMinima { get; set; }
    public decimal? ValorUnitario { get; set; }
    public string? Observacao { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public DateTime UpdatedAt { get; set; } = DateTime.Now;

    public Propriedade Propriedade { get; set; } = null!;
    public List<EstoqueMovimentacao> Movimentacoes { get; set; } = new();
}
