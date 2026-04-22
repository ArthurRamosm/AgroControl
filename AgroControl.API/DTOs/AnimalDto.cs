namespace AgroControl.API.DTOs;

public class CadastrarAnimalDto
{
    public string Brinco { get; set; } = string.Empty;
    public string? Nome { get; set; }
    public string Raca { get; set; } = string.Empty;
    public string Sexo { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string StatusLeite { get; set; } = "N/A";
    public int PropriedadeId { get; set; } = 1;
}

public class AnimalResponseDto
{
    public int Id { get; set; }
    public string Brinco { get; set; } = string.Empty;
    public string? Nome { get; set; }
    public string Raca { get; set; } = string.Empty;
    public string Sexo { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string StatusLeite { get; set; } = string.Empty;
    public bool Ativo { get; set; }
}
