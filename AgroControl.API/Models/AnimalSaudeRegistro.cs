namespace AgroControl.API.Models;

public class AnimalSaudeRegistro
{
    public int Id { get; set; }
    public int AnimalId { get; set; }
    public string TipoRegistro { get; set; } = string.Empty;
    public DateTime DataRegistro { get; set; }
    public string? Descricao { get; set; }
    public string? ProdutoUtilizado { get; set; }
    public string? Dose { get; set; }
    public string? Veterinario { get; set; }
    public DateTime? ProximaAplicacao { get; set; }
    public string? Observacao { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public Animal Animal { get; set; } = null!;
}
