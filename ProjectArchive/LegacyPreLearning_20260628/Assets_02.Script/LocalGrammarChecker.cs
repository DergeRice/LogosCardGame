using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using UnityEngine;

public static class LocalGrammarChecker
{
    private const int MaxTokens = 30;

    private static readonly Grammar GrammarData = Grammar.Build(GrammarText);

    public static bool CheckFromJsonArray(string jsonArray)
    {
        if (string.IsNullOrWhiteSpace(jsonArray))
        {
            return false;
        }

        try
        {
            List<string> tokens = JsonConvert.DeserializeObject<List<string>>(jsonArray);
            return CheckTokens(tokens);
        }
        catch (Exception e)
        {
            Debug.LogWarning($"[LocalGrammarChecker] JSON parse failed: {e.Message}");
            return false;
        }
    }

    public static GrammarCheckResult CheckDetailedFromJsonArray(string jsonArray)
    {
        if (string.IsNullOrWhiteSpace(jsonArray))
        {
            return new GrammarCheckResult { valid = false, handType = 0 };
        }

        try
        {
            List<string> tokens = JsonConvert.DeserializeObject<List<string>>(jsonArray);
            return CheckDetailedTokens(tokens);
        }
        catch (Exception e)
        {
            Debug.LogWarning($"[LocalGrammarChecker] JSON parse failed: {e.Message}");
            return new GrammarCheckResult { valid = false, handType = 0 };
        }
    }

    public static bool CheckTokens(IReadOnlyList<string> tokens)
    {
        if (tokens == null || tokens.Count == 0)
        {
            return false;
        }

        if (tokens.Count > MaxTokens)
        {
            Debug.LogWarning($"[LocalGrammarChecker] Too many tokens: {tokens.Count}");
            return false;
        }

        for (int i = 0; i < tokens.Count; i++)
        {
            string token = tokens[i];
            if (string.IsNullOrWhiteSpace(token) || !GrammarData.Terminals.Contains(token))
            {
                Debug.LogWarning($"[LocalGrammarChecker] Undefined token: {token}");
                return false;
            }
        }

        return EarleyAccepts(tokens, "S", GrammarData);
    }

    public static GrammarCheckResult CheckDetailedTokens(IReadOnlyList<string> tokens)
    {
        bool valid = CheckTokens(tokens);
        if (!valid)
        {
            return new GrammarCheckResult { valid = false, handType = 0 };
        }

        int handType = InferHandTypeCfgPreferred(tokens);
        return new GrammarCheckResult { valid = true, handType = handType };
    }

    private static int InferHandTypeCfgPreferred(IReadOnlyList<string> tokens)
    {
        // Scoring handType mapping:
        // 1: SV (intransitive)
        // 2: SVC (BE/coplanar)
        // 3: SVO
        // 4: SVOO
        // 5: SVOC
        //
        // This is "CFG-preferred":
        // - First, use CFG acceptance to positively identify BE-family sentences as type 2.
        // - Then, classify by object-NP count on a simplified token stream (adverbs removed).
        //
        // We avoid building full parse trees (Earley chart here is acceptance-only).

        if (tokens == null || tokens.Count == 0) return 0;

        // CompoundSentence: classify each clause separated by CC and use the max (most "complex") as handType.
        // This matches how people intuitively read "A and B" as at least as complex as its parts.
        int best = 0;
        int segStart = 0;
        for (int i = 0; i <= tokens.Count; i++)
        {
            bool atEnd = i >= tokens.Count;
            bool atCc = !atEnd && string.Equals(tokens[i], "CC", StringComparison.Ordinal);
            if (!atEnd && !atCc) continue;

            int segEnd = i - 1;
            if (segEnd >= segStart)
            {
                var segment = Slice(tokens, segStart, segEnd);
                int t = InferClauseHandType(segment);
                if (t > best) best = t;
            }

            segStart = i + 1;
        }

        return best;
    }

    private static int InferClauseHandType(List<string> tokens)
    {
        if (tokens == null || tokens.Count == 0) return 0;

        // Remove adverbs for classification; CFG still validated on full token list already.
        tokens.RemoveAll(IsAdverb);
        if (tokens.Count == 0) return 0;

        // Strong CFG-based 2형식 detection.
        // If the clause can be derived as one of BE sentence nonterminals, treat it as 2.
        // Note: we run acceptance on simplified tokens to reduce false negatives from RB insertions.
        if (EarleyAccepts(tokens, "BE_Sentence", GrammarData)
            || EarleyAccepts(tokens, "BE_NegSentence", GrammarData)
            || EarleyAccepts(tokens, "MODAL_BE_Sentence", GrammarData))
        {
            return 2;
        }

        // Strip leading auxiliaries in questions:
        // SQ -> DO NP VB ... / MODAL NP VB ... / BE NP ...
        int idx = 0;
        if (idx < tokens.Count && (string.Equals(tokens[idx], "DO", StringComparison.Ordinal)
            || string.Equals(tokens[idx], "MODAL", StringComparison.Ordinal)
            || string.Equals(tokens[idx], "BE", StringComparison.Ordinal)))
        {
            idx++;
        }

        int end = tokens.Count - 1;

        // Consume subject NP if present.
        idx = ConsumeNp(tokens, idx, end);

        // Find main verb VB/BE.
        int verbIdx = FindVerb(tokens, idx, end);
        if (verbIdx < 0) return 0;

        // BE here (if any) fell through CFG-based check; still treat as 2.
        if (string.Equals(tokens[verbIdx], "BE", StringComparison.Ordinal)) return 2;

        int cursor = verbIdx + 1;

        // Count immediate NP chunks after the verb.
        int npCount = 0;
        int afterFirstObj = cursor;

        while (cursor <= end)
        {
            int before = cursor;
            cursor = ConsumeNp(tokens, cursor, end);
            if (cursor == before)
            {
                cursor++;
                continue;
            }

            npCount++;
            if (npCount == 1) afterFirstObj = cursor;
            if (npCount >= 2) break;
        }

        if (npCount == 0) return 1;
        if (npCount >= 2) return 4;

        // npCount == 1: distinguish 3 vs 5 by whether an object-complement-ish tail exists.
        if (HasObjectComplement(tokens, afterFirstObj, end)) return 5;
        return 3;
    }

    private static bool HasObjectComplement(IReadOnlyList<string> tokens, int idx, int end)
    {
        // SVOC candidates in current grammar:
        // VP -> VB NP ADJP | VB NP JJ | VB NP NP | VB NP VB | VB NP TO_VB | VB NP RB ADJP | VB NP ADJP PP
        //
        // Here we just check if after the first object NP we see:
        // - JJ
        // - another NP chunk
        // - VB / TO_VB
        // - ADJP lead (RB/JJ patterns)
        for (int k = idx; k <= end; k++)
        {
            string t = tokens[k];
            if (string.Equals(t, "JJ", StringComparison.Ordinal)) return true;
            if (string.Equals(t, "VB", StringComparison.Ordinal)) return true;
            if (string.Equals(t, "TO_VB", StringComparison.Ordinal)) return true;
            if (IsNpToken(t)) return ConsumeNp(tokens, k, end) > k;
            if (string.Equals(t, "RB", StringComparison.Ordinal) && k + 1 <= end && string.Equals(tokens[k + 1], "JJ", StringComparison.Ordinal)) return true;
            if (string.Equals(t, "IN", StringComparison.Ordinal))
            {
                // PP after object complement is possible, but PP alone doesn't imply complement.
                continue;
            }
        }

        return false;
    }

    private static bool IsAux(string t)
    {
        return string.Equals(t, "DO", StringComparison.Ordinal)
            || string.Equals(t, "MODAL", StringComparison.Ordinal)
            || string.Equals(t, "BE", StringComparison.Ordinal);
    }

    private static bool IsAdverb(string t)
    {
        return string.Equals(t, "RB", StringComparison.Ordinal)
            || string.Equals(t, "RB_FREQ", StringComparison.Ordinal);
    }

    private static bool IsVerb(string t)
    {
        return string.Equals(t, "VB", StringComparison.Ordinal)
            || string.Equals(t, "BE", StringComparison.Ordinal);
    }

    private static int FindVerb(IReadOnlyList<string> tokens, int idx, int end)
    {
        for (int i = idx; i <= end; i++)
        {
            if (IsVerb(tokens[i])) return i;
        }
        return -1;
    }

    private static bool IsNpToken(string t)
    {
        // Approximation of NP building blocks.
        return string.Equals(t, "PRP", StringComparison.Ordinal)
            || string.Equals(t, "PRP_POS", StringComparison.Ordinal)
            || string.Equals(t, "DT_AN", StringComparison.Ordinal)
            || string.Equals(t, "DT_THE", StringComparison.Ordinal)
            || string.Equals(t, "NNC", StringComparison.Ordinal)
            || string.Equals(t, "NNU", StringComparison.Ordinal)
            || string.Equals(t, "JJ", StringComparison.Ordinal);
    }

    private static int ConsumeNp(IReadOnlyList<string> tokens, int idx, int end)
    {
        int i = idx;
        bool consumedAny = false;
        while (i <= end && IsNpToken(tokens[i]))
        {
            consumedAny = true;
            i++;
        }
        return consumedAny ? i : idx;
    }

    private static List<string> Slice(IReadOnlyList<string> tokens, int start, int end)
    {
        var result = new List<string>();
        for (int i = start; i <= end; i++)
        {
            result.Add(tokens[i]);
        }
        return result;
    }

    private static bool EarleyAccepts(IReadOnlyList<string> tokens, string startSymbol, Grammar grammar)
    {
        int n = tokens.Count;

        var chart = new List<HashSet<State>>(n + 1);
        var agenda = new List<Queue<State>>(n + 1);

        for (int i = 0; i <= n; i++)
        {
            chart.Add(new HashSet<State>());
            agenda.Add(new Queue<State>());
        }

        if (!grammar.RulesByLhs.TryGetValue(startSymbol, out List<int> startRuleIds))
        {
            return false;
        }

        for (int i = 0; i < startRuleIds.Count; i++)
        {
            AddState(chart, agenda, 0, new State(startRuleIds[i], 0, 0));
        }

        for (int i = 0; i <= n; i++)
        {
            Queue<State> queue = agenda[i];
            while (queue.Count > 0)
            {
                State state = queue.Dequeue();
                Rule rule = grammar.Rules[state.RuleId];

                if (!state.IsComplete(rule))
                {
                    Symbol next = rule.Rhs[state.Dot];

                    if (next.IsTerminal)
                    {
                        if (i < n && string.Equals(tokens[i], next.Name, StringComparison.Ordinal))
                        {
                            AddState(chart, agenda, i + 1, state.Advance());
                        }
                    }
                    else
                    {
                        if (grammar.RulesByLhs.TryGetValue(next.Name, out List<int> predictRuleIds))
                        {
                            for (int r = 0; r < predictRuleIds.Count; r++)
                            {
                                AddState(chart, agenda, i, new State(predictRuleIds[r], 0, i));
                            }
                        }
                    }
                }
                else
                {
                    string completedLhs = rule.Lhs;
                    HashSet<State> originStates = chart[state.Start];

                    foreach (State prev in originStates)
                    {
                        Rule prevRule = grammar.Rules[prev.RuleId];
                        if (prev.IsComplete(prevRule))
                        {
                            continue;
                        }

                        Symbol prevNext = prevRule.Rhs[prev.Dot];
                        if (!prevNext.IsTerminal && string.Equals(prevNext.Name, completedLhs, StringComparison.Ordinal))
                        {
                            AddState(chart, agenda, i, prev.Advance());
                        }
                    }
                }
            }
        }

        foreach (State finalState in chart[n])
        {
            Rule rule = grammar.Rules[finalState.RuleId];
            if (string.Equals(rule.Lhs, startSymbol, StringComparison.Ordinal)
                && finalState.Start == 0
                && finalState.IsComplete(rule))
            {
                return true;
            }
        }

        return false;
    }

    private static void AddState(List<HashSet<State>> chart, List<Queue<State>> agenda, int index, State state)
    {
        if (chart[index].Add(state))
        {
            agenda[index].Enqueue(state);
        }
    }

    private readonly struct State : IEquatable<State>
    {
        public readonly int RuleId;
        public readonly int Dot;
        public readonly int Start;

        public State(int ruleId, int dot, int start)
        {
            RuleId = ruleId;
            Dot = dot;
            Start = start;
        }

        public bool IsComplete(Rule rule)
        {
            return Dot >= rule.Rhs.Count;
        }

        public State Advance()
        {
            return new State(RuleId, Dot + 1, Start);
        }

        public bool Equals(State other)
        {
            return RuleId == other.RuleId && Dot == other.Dot && Start == other.Start;
        }

        public override bool Equals(object obj)
        {
            return obj is State other && Equals(other);
        }

        public override int GetHashCode()
        {
            unchecked
            {
                int hash = RuleId;
                hash = (hash * 397) ^ Dot;
                hash = (hash * 397) ^ Start;
                return hash;
            }
        }
    }

    private sealed class Grammar
    {
        public readonly List<Rule> Rules;
        public readonly Dictionary<string, List<int>> RulesByLhs;
        public readonly HashSet<string> Terminals;

        private Grammar(List<Rule> rules, Dictionary<string, List<int>> rulesByLhs, HashSet<string> terminals)
        {
            Rules = rules;
            RulesByLhs = rulesByLhs;
            Terminals = terminals;
        }

        public static Grammar Build(string grammarText)
        {
            var rules = new List<Rule>();
            var rulesByLhs = new Dictionary<string, List<int>>(StringComparer.Ordinal);
            var terminals = new HashSet<string>(StringComparer.Ordinal);

            string[] lines = grammarText.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            for (int i = 0; i < lines.Length; i++)
            {
                string rawLine = lines[i];
                int commentIdx = rawLine.IndexOf('#');
                string line = commentIdx >= 0 ? rawLine.Substring(0, commentIdx) : rawLine;
                line = line.Trim();

                if (line.Length == 0 || !line.Contains("->"))
                {
                    continue;
                }

                string[] lr = line.Split(new[] { "->" }, 2, StringSplitOptions.None);
                if (lr.Length != 2)
                {
                    continue;
                }

                string lhs = lr[0].Trim();
                string rhsBlock = lr[1].Trim();
                if (lhs.Length == 0 || rhsBlock.Length == 0)
                {
                    continue;
                }

                string[] alternatives = rhsBlock.Split('|');
                for (int altIdx = 0; altIdx < alternatives.Length; altIdx++)
                {
                    string alt = alternatives[altIdx].Trim();
                    if (alt.Length == 0)
                    {
                        continue;
                    }

                    string[] rhsTokens = alt.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                    var rhs = new List<Symbol>(rhsTokens.Length);

                    for (int t = 0; t < rhsTokens.Length; t++)
                    {
                        string token = rhsTokens[t].Trim();
                        bool isTerminal = token.Length >= 2 && token[0] == '\'' && token[token.Length - 1] == '\'';

                        if (isTerminal)
                        {
                            string terminal = token.Substring(1, token.Length - 2);
                            rhs.Add(new Symbol(terminal, true));
                            terminals.Add(terminal);
                        }
                        else
                        {
                            rhs.Add(new Symbol(token, false));
                        }
                    }

                    int ruleId = rules.Count;
                    rules.Add(new Rule(lhs, rhs));

                    if (!rulesByLhs.TryGetValue(lhs, out List<int> ids))
                    {
                        ids = new List<int>();
                        rulesByLhs[lhs] = ids;
                    }

                    ids.Add(ruleId);
                }
            }

            return new Grammar(rules, rulesByLhs, terminals);
        }
    }

    private readonly struct Symbol
    {
        public readonly string Name;
        public readonly bool IsTerminal;

        public Symbol(string name, bool isTerminal)
        {
            Name = name;
            IsTerminal = isTerminal;
        }
    }

    private sealed class Rule
    {
        public readonly string Lhs;
        public readonly List<Symbol> Rhs;

        public Rule(string lhs, List<Symbol> rhs)
        {
            Lhs = lhs;
            Rhs = rhs;
        }
    }

    private const string GrammarText = @"
S -> Sentence
Sentence -> SimpleSentence | CompoundSentence
CompoundSentence -> SimpleSentence CC SimpleSentence
CompoundSentence -> SimpleSentence CC SimpleSentence CC SimpleSentence

SimpleSentence -> RB SimpleSentence
SimpleSentence -> SimpleSentence RB
SimpleSentence -> RB_FREQ SimpleSentence
SimpleSentence -> SimpleSentence RB_FREQ
SimpleSentence -> RB SimpleSentence RB
SimpleSentence -> RB_FREQ SimpleSentence RB_FREQ

SimpleSentence -> NP VP
SimpleSentence -> NP NegVP
SimpleSentence -> DO_Sentence
SimpleSentence -> MODAL_Sentence
SimpleSentence -> MODAL_BE_Sentence
SimpleSentence -> BE_Sentence
SimpleSentence -> BE_NegSentence

MODAL_Sentence -> MODAL NP VB
MODAL_Sentence -> MODAL NP VB NP
MODAL_Sentence -> MODAL NP NP VB
MODAL_Sentence -> MODAL NP RB VB
MODAL_Sentence -> MODAL NP RB_FREQ VB
MODAL_Sentence -> MODAL NP VB RB
MODAL_Sentence -> MODAL NP VB RB_FREQ
MODAL_Sentence -> MODAL RB VB
MODAL_Sentence -> MODAL RB_FREQ VB
MODAL_Sentence -> MODAL VP
MODAL_Sentence -> MODAL NP RB_FREQ VB NP NP
MODAL_Sentence -> MODAL NP RB VB NP NP
MODAL_Sentence -> MODAL NP VB RB_FREQ NP NP
MODAL_Sentence -> MODAL NP VB RB NP NP

NegVP -> MODAL RB_NOT VB
NegVP -> MODAL RB_NOT VB NP
NegVP -> MODAL RB_NOT VB NP NP
NegVP -> MODAL RB_NOT RB VB

MODAL_BE_Sentence -> MODAL BE NP
MODAL_BE_Sentence -> MODAL BE ADJP
MODAL_BE_Sentence -> MODAL BE JJ
MODAL_BE_Sentence -> MODAL BE NNU
MODAL_BE_Sentence -> MODAL BE RB ADJP
MODAL_BE_Sentence -> MODAL BE RB_FREQ ADJP
MODAL_BE_Sentence -> MODAL BE RB NNU
MODAL_BE_Sentence -> MODAL BE VP

DO_Sentence -> DO NP VB
DO_Sentence -> DO NP VB NP
DO_Sentence -> DO NP NP VB
DO_Sentence -> DO NP RB VB
DO_Sentence -> DO NP VB RB
DO_Sentence -> DO NP RB_FREQ VB
DO_Sentence -> DO NP VB RB_FREQ
DO_Sentence -> DO RB VB
DO_Sentence -> DO RB_FREQ VB
DO_Sentence -> DO NP VB PP
DO_Sentence -> DO VP

NegVP -> DO RB_NOT VB
NegVP -> DO RB_NOT VB NP
NegVP -> DO RB_NOT VB NP NP
NegVP -> DO RB_NOT RB VB
NegVP -> DO RB_NOT VB NP ADJP
NegVP -> DO RB_NOT VB NP ADJP PP

BE_Sentence -> NP BE ADJP
BE_Sentence -> NP BE RB ADJP
BE_Sentence -> NP BE RB_FREQ ADJP
BE_Sentence -> NP BE NP
BE_Sentence -> BE NP
BE_Sentence -> BE NP RB
BE_Sentence -> BE NP RB_FREQ
BE_Sentence -> NP BE JJ
BE_Sentence -> NP BE NNU
BE_Sentence -> NP BE RB NNU
BE_Sentence -> NP BE DT_AN NNC
BE_Sentence -> NP BE VP
BE_Sentence -> NP BE RB_FREQ NNU
BE_Sentence -> NP BE RB_FREQ JJ
BE_Sentence -> NP BE NP
BE_Sentence -> NP BE ADJP

BE_NegSentence -> NP BE RB_NOT ADJP
BE_NegSentence -> NP BE RB_NOT NP
BE_NegSentence -> NP BE RB_NOT JJ
BE_NegSentence -> NP BE RB_NOT DT_THE NNU
BE_NegSentence -> NP BE RB_NOT VP

NP -> PRP
NP -> PRP_POS NNC
NP -> PRP_POS NNU
NP -> DT_AN NNC
NP -> DT_THE NNC
NP -> DT_THE JJ NNC
NP -> JJ NNU

NP -> NNU
NP -> PRP_POS NNU PP
NP -> NP PP
NP -> DT_THE NNC
NP -> DT_THE NNU
NP -> DT_AN JJ NNC
NP -> DT_THE JJ NNU
NP -> ADJP NNC
NP -> ADJP NNU
NP -> DT_AN ADJP NNC
NP -> DT_THE ADJP NNC
NP -> PRP_POS ADJP NNC

NP -> JJ JJ NNC
NP -> JJ JJ NNU
NP -> DT_AN JJ JJ NNC
NP -> DT_THE JJ JJ NNC
NP -> DT_THE JJ JJ NNU
NP -> PRP_POS JJ NNC
NP -> PRP_POS JJ JJ NNC
NP -> PRP_POS JJ NNU

NP -> ADJP NNC
NP -> ADJP NNU
NP -> DT_AN ADJP NNC
NP -> DT_THE ADJP NNC
NP -> PRP_POS ADJP NNC
ADJP -> JJ JJ
NP -> DT_AN JJ JJ NNC
NP -> DT_THE JJ JJ NNC
NP -> DT_THE JJ JJ NNU
NP -> PRP_POS JJ JJ NNC

PP -> IN NP
PP -> IN NP PP

ADJP -> JJ
ADJP -> RB JJ
ADJP -> RB_FREQ JJ
ADJP -> ADJP PP

VP -> VB
VP -> VB NP
VP -> VB NP RB
VP -> VB NP RB_FREQ
VP -> VB RB
VP -> VB RB_FREQ
VP -> RB VB
VP -> RB_FREQ VB
VP -> VP PP
VP -> RB VP
VP -> VP RB
VP -> VP RB_FREQ
VP -> VP VP
VP -> VB NP VP
VP -> VB NP PP VP
VP -> RB VP VP
VP -> MODAL VB
VP -> MODAL VB NP
VP -> MODAL VB PP
VP -> MODAL RB VB
VP -> MODAL VB RB
VP -> MODAL RB VB NP

VP -> MODAL VB
VP -> MODAL RB VB
VP -> MODAL RB_FREQ VB
VP -> MODAL VB NP
VP -> MODAL VB NP NP
VP -> MODAL VB PP
VP -> MODAL VB NP PP
VP -> MODAL VB NP RB
VP -> MODAL VB NP RB_FREQ

VP -> MODAL RB_FREQ VB NP

VP -> RB_FREQ VB
VP -> RB_FREQ VB NP
VP -> RB_FREQ VB PP
VP -> RB_FREQ VB NP PP

VP -> VB NP NP
VP -> VB NP NP RB
VP -> VB NP NP RB_FREQ
VP -> RB VB NP NP
VP -> VB RB NP NP
VP -> VB NP RB NP
VP -> VB NP NP PP

VP -> VB NP ADJP
VP -> VB NP NP
VP -> VB NP JJ
VP -> VB NP VB
VP -> VB NP TO_VB
VP -> VB NP RB ADJP
VP -> VB NP RB_FREQ ADJP
VP -> VB NP ADJP PP

SQ -> DO NP VB
SQ -> DO NP VB NP
SQ -> DO NP VB PP
SQ -> DO NP RB VB
SQ -> DO NP VB RB
SQ -> DO NP RB_FREQ VB
SQ -> DO NP VB RB_FREQ
SQ -> DO NP VB NP NP
SQ -> DO NP RB_NOT RB_FREQ VB
SQ -> DO NP VB NP NP
SQ -> DO NP VB NP PP
SQ -> DO NP VB PP RB_FREQ
SQ -> DO NP RB_FREQ VB

SQ -> BE NP
SQ -> BE NP ADJP
SQ -> BE NP NP
SQ -> BE NP PP
SQ -> BE RB NP
SQ -> BE NP RB
SQ -> BE NP RB_FREQ
SQ -> BE NP RB_FREQ ADJP
SQ -> BE NP RB_FREQ NP
SQ -> BE NP RB_FREQ PP
SQ -> BE RB_FREQ NP
SQ -> BE NP RB_FREQ
SQ -> BE NP RB_FREQ ADJP
SQ -> BE NP RB_FREQ NP
SQ -> BE NP RB_FREQ PP
SQ -> BE RB_FREQ NP

SQ -> MODAL NP VB
SQ -> MODAL NP VB NP
SQ -> MODAL NP VB PP
SQ -> MODAL NP RB VB
SQ -> MODAL NP VB RB
SQ -> MODAL NP RB_FREQ VB
SQ -> MODAL NP VB RB_FREQ
SQ -> MODAL NP VB NP NP

SQ -> MODAL NP RB_NOT VB
SQ -> MODAL NP RB_NOT VB NP
SQ -> MODAL NP RB_NOT VB PP
SQ -> MODAL NP RB_NOT VB NP NP
SQ -> MODAL NP RB_NOT RB VB
SQ -> MODAL NP RB_NOT VB RB
SQ -> MODAL NP RB_NOT RB_FREQ VB
SQ -> MODAL NP RB_NOT VB RB_FREQ
SQ -> MODAL NP RB_NOT VB
SQ -> MODAL NP RB_NOT VB NP
SQ -> MODAL NP RB_NOT VB NP NP
SQ -> MODAL NP RB_NOT VB PP
SQ -> MODAL NP RB_NOT ADJP
SQ -> MODAL NP RB_NOT RB VB
SQ -> MODAL NP RB_NOT VB RB
SQ -> MODAL NP RB_NOT RB_FREQ VB
SQ -> MODAL NP RB_NOT VB RB_FREQ

S -> NP DO RB_NOT VB
S -> NP DO RB_NOT VB NP
S -> NP DO RB_NOT VB PP
S -> NP DO RB_NOT VB NP NP
S -> NP DO RB_NOT VB ADJP
S -> NP DO RB_NOT VB RB
S -> NP DO RB_NOT VB RB_FREQ

S -> NP MODAL RB_NOT VB
S -> NP MODAL RB_NOT VB NP
S -> NP MODAL RB_NOT VB NP NP
S -> NP MODAL RB_NOT VB PP
S -> NP MODAL RB_NOT ADJP

S -> NP BE RB_NOT
S -> NP BE RB_NOT ADJP
S -> NP BE RB_NOT NP
S -> NP BE RB_NOT PP
S -> NP BE RB_NOT JJ
S -> NP BE RB_NOT NNU
S -> NP BE RB_NOT RB JJ
S -> NP BE RB_NOT RB_FREQ JJ

SQ -> DO NP RB_NOT VB
SQ -> DO NP RB_NOT VB NP
SQ -> DO NP RB_NOT VB PP
SQ -> DO NP RB_NOT VB NP NP
SQ -> DO NP RB_NOT VB RB
SQ -> DO NP RB_NOT VB RB_FREQ

SQ -> BE NP RB_NOT
SQ -> BE NP RB_NOT ADJP
SQ -> BE NP RB_NOT NP
SQ -> BE NP RB_NOT PP
SQ -> BE NP RB_NOT JJ
SQ -> BE NP RB_NOT NNU
SQ -> BE NP RB_NOT RB JJ
SQ -> BE NP RB_NOT RB_FREQ JJ

S -> SQ

TO_VB -> 'TO_VB'

PRP -> 'PRP'
PRP_POS -> 'PRP_POS'
DT_AN -> 'DT_AN'
DT_THE -> 'DT_THE'
JJ -> 'JJ'
NNC -> 'NNC'
NNU -> 'NNU'
VB -> 'VB'
DO -> 'DO'
MODAL -> 'MODAL'
BE -> 'BE'
RB -> 'RB'
RB_NOT -> 'RB_NOT'
RB_FREQ -> 'RB_FREQ'
IN -> 'IN'
CC -> 'CC'
";
}
