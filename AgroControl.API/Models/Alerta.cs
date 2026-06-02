namespace AgroControl.API.Models;

public class Alerta
{
    public int Id { get; set; }
    public int PropriedadeId { get; set; }
    public int? AnimalId { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public DateTime DataAlerta { get; set; }
    public bool Lido { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public Propriedade Propriedade { get; set; } = null!;
    public Animal? Animal { get; set; }
}
