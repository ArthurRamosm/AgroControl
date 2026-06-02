namespace AgroControl.API.Models;

public class PropriedadeArea
{
    public int Id { get; set; }
    public int PropriedadeId { get; set; }
    public string TipoCadastro { get; set; } = "AREA_INTERNA";
    public int? AreaPaiId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string TipoArea { get; set; } = string.Empty;
    public string? Cor { get; set; }
    public string? Observacao { get; set; }
    public string CoordenadasGeojson { get; set; } = string.Empty;
    public decimal? AreaHectares { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public Propriedade Propriedade { get; set; } = null!;
    public PropriedadeArea? AreaPai { get; set; }
    public ICollection<PropriedadeArea> AreasInternas { get; set; } = new List<PropriedadeArea>();
}
