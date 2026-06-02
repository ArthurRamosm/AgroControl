namespace AgroControl.API.Models;

public class Afastamento
{
    public int Id { get; set; }
    public int AnimalId { get; set; }
    public int PropriedadeId { get; set; }
    public string MotivoAfastamento { get; set; } = string.Empty;
    public DateTime DataAfastamento { get; set; }
    public string? ProdutoUtilizado { get; set; }
    public int? PeriodoCarencia { get; set; }
    public DateTime? DataRetorno { get; set; }
    public string? Observacao { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public Animal Animal { get; set; } = null!;
    public Propriedade Propriedade { get; set; } = null!;
}
