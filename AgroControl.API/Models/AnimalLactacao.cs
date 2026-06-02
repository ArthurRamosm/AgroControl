namespace AgroControl.API.Models;

public class AnimalLactacao
{
    public int Id { get; set; }
    public int AnimalId { get; set; }
    public int NumeroLactacao { get; set; }
    public DateTime? DataParto { get; set; }
    public DateTime? InicioControle { get; set; }
    public DateTime? DataSecagem { get; set; }
    public int? DiasLactacao { get; set; }
    public decimal? ProducaoTotal { get; set; }
    public decimal? MediaDiaria { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public Animal Animal { get; set; } = null!;
}
