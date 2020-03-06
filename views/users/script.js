$('.message.manage a').click(function(){
   $('div.register-form').animate({height: "toggle", opacity: "toggle"}, "slow");
   $('div.login-form').animate({height: "toggle", opacity: "toggle"}, "slow");
});
$('.message.back a').click(function(){
   $('div.register-form').animate({height: "toggle", opacity: "toggle"}, "slow");
   $('div.login-form').animate({height: "toggle", opacity: "toggle"}, "slow");
});
$('.message.users a').click(function(){
   $('div.register-form').animate({height: "toggle", opacity: "toggle"}, "slow");
   $('div.user').animate({height: "toggle", opacity: "toggle"}, "slow");
});
var xhr = new XMLHttpRequest();
function doGet(fileName){
				xhr.open('GET', fileName, false);
				xhr.send();
				return xhr.responseText;
}

function setUserList () {
	var lst = document.getElementById('rmvlist');
	var usArr = doGet('user_list').split(',');
	
	for (var i = 0; i < usArr.length; i++) {
		lst.innerHTML += '<option value="' + usArr[i] + '">' + usArr[i] + '</option>';
	}
	

}
			
			