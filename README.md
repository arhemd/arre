# Arre

## Etymology
*Arre* is named after [https://www.aparat.com/v/Hugph/ارّه_و_انگلیس!](this video)

## How to run

### Method 1: The Easier Method

An executable file is provided to avoid installing the required npm packages and simplify running process:

1. Clone.
```
cd /root
git clone https://github.com/MehradDadar/arre.git
```

2. Create `/root/arre/users` file and initialize (use users-sample in order to understand the template)
```
vim /root/arre/users
``` 

3. Put certificates in `/root/arre/secrets/`

4. Use `iptables-setup.sh` to set required iptables rules.
```
bash /root/arre/iptables-setup.sh
#Enter the port you want to manage.
```

5. Run `app` in the background and enjoy!
```
/root/arre/app& >> /root/arre/log
```

### Method 2: For Developers

1. Clone.
```
cd /root
git clone https://github.com/MehradDadar/arre.git
```

2. Create `/root/arre/users` file and initialize (use users-sample in order to understand the template)
```
vim /root/arre/users
``` 

3. Put certificates in `/root/arre/secrets/`

4. Use `gharb-up.sh` to set required iptables rules and install nodejs and required packages
```
bash /root/arre/gharb-up.sh
```

5. Run `app.js` in the background
```
forever start -a -o /root/arre/login/log /root/arre/app.js
```
