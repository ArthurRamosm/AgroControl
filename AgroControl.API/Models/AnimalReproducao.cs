namespace AgroControl.API.Models;

public class AnimalReproducao
{
    public int Id { get; set; }
    public int AnimalId { get; set; }
    public string TipoEvento { get; set; } = string.Empty;
    public DateTime DataEvento { get; set; }
    public string? Reprodutor { get; set; }
    public string? Inseminador { get; set; }
    public DateTime? PrevisaoParto { get; set; }
    public string? Resultado { get; set; }
    public string? Observacao { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public Animal Animal { get; set; } = null!;
}
