namespace AgroControl.API.Models;

public class Animal
{
    public int Id { get; set; }
    public string Brinco { get; set; } = string.Empty;
    public string? Nome { get; set; }
    public string Raca { get; set; } = string.Empty;
    public string? Raca2 { get; set; }
    public string Sexo { get; set; } = string.Empty;       
    public string Tipo { get; set; } = string.Empty;      
    public string StatusLeite { get; set; } = "N/A";
    public bool Ativo { get; set; } = true;
    public string? NumeroAnimal { get; set; }
    public DateTime? DataNascimento { get; set; }
    public string? DataNascimentoInformada { get; set; }
    public int? PaiAnimalId { get; set; }
    public string? NomePai { get; set; }
    public string? RacaPai { get; set; }
    public int? MaeAnimalId { get; set; }
    public string? NomeMae { get; set; }
    public string? RacaMae { get; set; }
    public string? Procedencia { get; set; }
    public DateTime? DataEntrada { get; set; }
    public string? DataEntradaInformada { get; set; }
    public DateTime? DataSaida { get; set; }
    public string? DataSaidaInformada { get; set; }
    public decimal? Valor { get; set; }
    public string? MotivoSaida { get; set; }
    public string? MarcaSinal { get; set; }
    public string? Observacao { get; set; }

    public int PropriedadeId { get; set; }
    public Propriedade Propriedade { get; set; } = null!;
    public Animal? PaiAnimal { get; set; }
    public Animal? MaeAnimal { get; set; }
    public List<AnimalFoto> Fotos { get; set; } = new();
    public List<AnimalEvento> Eventos { get; set; } = new();
    public List<AnimalLactacao> Lactacoes { get; set; } = new();
    public List<AnimalVacina> Vacinas { get; set; } = new();
    public List<AnimalSaudeRegistro> SaudeRegistros { get; set; } = new();
    public List<AnimalReproducao> Reproducoes { get; set; } = new();
}
