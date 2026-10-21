using System.IO;
using UnityEditor.Android;

namespace Logos.Native.Editor
{
    // Older EDM4U versions inject jcenter(), removed by Gradle 9, after template generation.
    public sealed class LogosGradleCompatibility : IPostGenerateGradleAndroidProject
    {
        public int callbackOrder => int.MaxValue;
        public void OnPostGenerateGradleAndroidProject(string path) {
            foreach(var file in Directory.GetFiles(Directory.GetParent(path).FullName,"*.gradle",SearchOption.AllDirectories)) {
                var source=File.ReadAllText(file);
                var updated=source.Replace("jcenter()", "mavenCentral()");
                if(source!=updated) File.WriteAllText(file,updated);
            }
        }
    }
}
