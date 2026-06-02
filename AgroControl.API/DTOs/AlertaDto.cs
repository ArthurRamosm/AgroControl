namespace AgroControl.API.DTOs;

public class AlertaResponseDto
{
    public int Id { get; set; }
    public int? AnimalId { get; set; }
    public string? AnimalNome { get; set; }
    public string? AnimalBrinco { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public DateTime DataAlerta { get; set; }
    public bool Lido { get; set; }
}
