namespace AgroControl.API.Models;

public class AnimalFoto
{
    public int Id { get; set; }
    public int AnimalId { get; set; }
    public string FotoBase64 { get; set; } = string.Empty;
    public int Ordem { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public Animal Animal { get; set; } = null!;
}
