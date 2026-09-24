using Microsoft.AspNetCore.Mvc;

namespace Sistema_Escolar.Controllers
{
    public class SitioWebController : Controller
    {

        public IActionResult Sitio()
        {
            return View();
        }
    }
}
