// Harness only. The supplied checker is compiled unchanged. No Unity installation needed.
namespace UnityEngine { public static class Debug { public static void Log(object value) {} } }
public static class OracleHarness
{
    private static string Encode(string text) => text == null ? "NULL" : System.Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(text));
    public static void Run(string inputPath, string outputPath)
    {
        using (var writer = new System.IO.StreamWriter(outputPath, false, new System.Text.UTF8Encoding(false)))
        {
            foreach (var line in System.IO.File.ReadLines(inputPath))
            {
                var fields = line.Split('|');
                LearningPosType[] sequence = null;
                if (fields[3] != "NULL")
                {
                    var values = fields[3].Length == 0 ? new string[0] : fields[3].Split(',');
                    sequence = new LearningPosType[values.Length];
                    for (int i = 0; i < values.Length; i++) sequence[i] = (LearningPosType)int.Parse(values[i]);
                }
                var result = fields[1] == "check" ? LearningLocalGrammarChecker.Check(sequence) : LearningLocalGrammarChecker.CheckPlayableSegment(sequence, fields[2] == "true");
                writer.WriteLine(fields[0] + "|" + result.valid.ToString().ToLowerInvariant() + "|" + (int)result.patternType + "|" + result.usedStartIndex + "|" + result.usedLength + "|" + Encode(result.message) + "|" + Encode(result.debugLog));
            }
        }
    }
}
