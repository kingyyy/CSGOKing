import { CSGOKingPage } from './app.po';

describe('csgoking App', () => {
  let page: CSGOKingPage;

  beforeEach(() => {
    page = new CSGOKingPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
