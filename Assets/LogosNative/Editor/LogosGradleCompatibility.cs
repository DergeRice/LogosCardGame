using System.IO;
using System.Linq;
using System.Xml.Linq;
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
            // Unity rewrites the custom manifest's value to false for its activities.
            // The WebView is the visible game surface and requires GPU composition.
            var manifest=Path.Combine(path,"src/main/AndroidManifest.xml");
            var document=XDocument.Load(manifest);
            var android=XNamespace.Get("http://schemas.android.com/apk/res/android");
            foreach(var activity in document.Descendants("activity").Where(node =>
                (string)node.Attribute(android+"name") == "com.unity3d.player.UnityPlayerActivity" ||
                (string)node.Attribute(android+"name") == "com.unity3d.player.UnityPlayerGameActivity"))
                activity.SetAttributeValue(android+"hardwareAccelerated","true");
            document.Save(manifest);
        }
    }
}
