namespace AgroControl.API.Models;

public class AnimalEvento
{
    public int Id { get; set; }
    public int AnimalId { get; set; }
    public string TipoEvento { get; set; } = string.Empty;
    public DateTime DataEvento { get; set; }
    public decimal? PesoKg { get; set; }
    public decimal? RacaoKgDia { get; set; }
    public decimal? LeiteLitrosDia { get; set; }
    public string? Observacao { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public Animal Animal { get; set; } = null!;
}
