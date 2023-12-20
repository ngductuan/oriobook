const account = require("../models/account.model");
const product = require("../models/product.model");
const authMethod = require("../methods/auth.methods");
const bcrypt = require("bcrypt");
const saltRounds = 10;

class accountController {
  signUp = async (req, res, next) => {
    try {
      // console.log(req.body);
      // Kiem tra xem email da duoc dung de tao tai khoan hay chua
      const oldAcc = await account.findOne({ email: req.body.email });
      if (oldAcc != null) {
        return res.send({ status: false });
      }

      // Tao tai khoan
      let newAcc = new account();
      newAcc.email = req.body.email;
      bcrypt.hash(req.body.password, saltRounds, async (err, hash) => {
        if (err) {
          return next(err);
        }
        newAcc.password = hash;

        await newAcc.save();

        const accessTokenLife = process.env.ACCESS_TOKEN_LIFE;
        const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;

        const dataForAccessToken = {
          email: newAcc.email,
          isAdmin: false,
        };

        const accessToken = await authMethod.generateToken(
          dataForAccessToken,
          accessTokenSecret,
          accessTokenLife
        );

        return res.send({ status: true, accessToken });
      });
    } catch (error) {
      next(error);
    }
  };

  signIn = async (req, res, next) => {
    try {
      // console.log(req.body);
      // Kiem tra xem email da duoc dung de tao tai khoan hay chua
      const Acc = await account.findOne({ email: req.body.email });
      if (Acc == null) {
        return res.send("email error");
      } else {
        bcrypt.compare(
          req.body.password,
          Acc.password,
          async function (err, result) {
            if (err) {
              return next(err);
            }
            if (!result) {
              return res.send("password error");
            }
            const accessTokenLife = process.env.ACCESS_TOKEN_LIFE;
            const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;

            const dataForAccessToken = {
              email: Acc.email,
              isAdmin: Acc.isAdmin,
            };

            const accessToken = await authMethod.generateToken(
              dataForAccessToken,
              accessTokenSecret,
              accessTokenLife
            );
            return res.send({ status: true, accessToken });
          }
        );
      }
    } catch (error) {
      next(error);
    }
  };

  getAccountDetail = async (req, res, next) => {
    try {
      const Acc = await account.findOne({ email: req.headers.email });
      return res.send(Acc);
    } catch (error) {
      next(error);
    }
  };

  updateAccountDetail = async (req, res, next) => {
    try {
      await account.updateOne(
        { email: req.headers.email },
        {
          $set: {
            firstName: req.body.account_first_name,
            lastName: req.body.account_last_name,
            phone: req.body.account_phone,
            address: req.body.account_address,
          },
        }
      );
      return res.send({ status: true });
    } catch (error) {
      next(error);
    }
  };

  updateAccountPassword = async (req, res, next) => {
    try {
      const Acc = await account.findOne({ email: req.headers.email });
      let Pw = "";
      bcrypt.hash(req.body.password_1, saltRounds, async (err, hash) => {
        if (err) {
          return next(err);
        }
        Pw = hash;
        await bcrypt.compare(
          req.body.password_current,
          Acc.password,
          async function (err, result) {
            if (err) {
              return next(err);
            }
            if (!result) {
              return res.send("password error");
            } else {
              console.log("Compera true");
              console.log(Pw);
              await account.updateOne(
                { email: req.headers.email },
                {
                  $set: {
                    password: Pw,
                  },
                }
              );
              return res.send({ status: true });
            }
          }
        );
      });
    } catch (error) {
      next(error);
    }
  };

  getCart = async (req, res, next) => {
    try {
      const Acc = await account.findOne({ email: req.headers.email });
      const promises = Acc.cart.map((_cart) => {
        const { id_product } = _cart;
        return product.findOne({ _id: id_product.toString() });
      });

      const productResult = await Promise.allSettled(promises);

      const standardlizeRes = productResult.reduce((arr, prod) => {
        const { status, value } = prod;
        if (status == "fulfilled" && value) {
          const quantities = Acc.cart.find(
            (_item) => _item.id_product.toString() == value._id.toString()
          ).quantity;
          return [...arr, { ...value._doc, quantities }];
        }
        return arr;
      }, []);

      return res.send(standardlizeRes);
    } catch (error) {
      next(error);
    }
  };

  addToCart = async (req, res, next) => {
    console.log(req.params.id);
    const Acc = await account.findOne({ email: req.headers.email });
    let newcart = Acc.cart;
    const pro = await newcart.find((obj) =>
      obj.id_product.toString().includes(req.params.id)
    );
    if (pro) {
      console.log(pro);
      const updatequantitycart = newcart.reduce((arr, obj) => {
        if (obj.id_product.toString() == pro.id_product.toString()) {
          return [...arr, { ...obj._doc, quantity: pro.quantity + 1 }];
        }
        return [...arr, obj._doc];
      }, []);
      console.log(updatequantitycart);
      newcart = updatequantitycart;
    } else {
      newcart.push({
        id_product: req.params.id,
        quantity: 1,
      });
    }

    try {
      await account.updateOne(
        { email: req.headers.email },
        {
          $set: {
            cart: newcart,
          },
        }
      );
      return res.send({ status: true });
    } catch (error) {
      next(error);
    }
  };

  removeFromCart = async (req, res, next) => {
    console.log(req.params.id);
    const Acc = await account.findOne({ email: req.headers.email });
    let newcart = Acc.cart;
    const pro = await newcart.find((obj) =>
      obj.id_product.toString().includes(req.params.id)
    );
    if (pro) {
      console.log(pro);
      const deletecart = newcart.filter((item) => item !== pro);
      console.log(deletecart);
      newcart = deletecart;
    }

    try {
      await account.updateOne(
        { email: req.headers.email },
        {
          $set: {
            cart: newcart,
          },
        }
      );
      return res.send({ status: true });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new accountController();
