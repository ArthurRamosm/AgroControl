namespace AgroControl.API.Models;

public class Receita
{
    public int Id { get; set; }
    public int PropriedadeId { get; set; }
    public string Tipo { get; set; } = "Outros";
    public string? Descricao { get; set; }
    public decimal Valor { get; set; }
    public DateTime DataReceita { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public Propriedade Propriedade { get; set; } = null!;
}
