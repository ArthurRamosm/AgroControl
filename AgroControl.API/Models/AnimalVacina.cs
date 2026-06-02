namespace AgroControl.API.Models;

public class AnimalVacina
{
    public int Id { get; set; }
    public int AnimalId { get; set; }
    public string NomeVacina { get; set; } = string.Empty;
    public DateTime DataAplicacao { get; set; }
    public string? Dose { get; set; }
    public string? Observacao { get; set; }
    public DateTime? ProximaAplicacao { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public Animal Animal { get; set; } = null!;
}
